import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
// SuccessPopup component - unchanged from your original code
const SuccessPopup = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4 }}
    className="fixed top-6 right-6 z-50 bg-green-100 border border-green-500 text-green-800 px-6 py-3 rounded-xl shadow-lg flex items-center justify-between"
  >
    {message}
    <button onClick={onClose} className="ml-4 text-green-800 hover:text-green-900 font-bold">
      &times;
    </button>
  </motion.div>
);

// Renamed the component from App to VerifyLoc
const VerifyLoc = () => {
  // Directly using the target boundary coordinates
  const targetBoundary = [
    [17.293525, 82.104875],
    [17.293525, 82.104880],
    [17.293530, 82.104880],
    [17.293530, 82.104875]
  ];

  const videoRef = useRef(null);

  // State variables
  const [locationVerified, setLocationVerified] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [showOverallSuccess, setShowOverallSuccess] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [distance, setDistance] = useState(null); // Keeping for display, though polygon check is primary
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationStatusMessage, setLocationStatusMessage] = useState("Waiting for location verification...");
  const [popupMessage, setPopupMessage] = useState("");
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loadingFace, setLoadingFace] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraStatusMessage, setCameraStatusMessage] = useState("Camera not started.");

  // --- Security constants ---
  const REQUIRED_GPS_ACCURACY_METERS = 15; // Accuracy must be 15m or better

  // Show popup
  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => setPopupMessage(""), 3000);
  };

  // Haversine distance calculation (kept for displaying distance to first boundary point)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Point-in-polygon algorithm (Ray Casting Algorithm)
  // This function checks if a point (lat, lon) is inside a polygon.
  // Polygon is an array of [lat, lon] pairs.
  const isPointInPolygon = (point, polygon) => {
    const x = point[1]; // Longitude
    const y = point[0]; // Latitude

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1];
      const yi = polygon[i][0];
      const xj = polygon[j][1];
      const yj = polygon[j][0];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Verify physical location
  const verifyPhysicalLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatusMessage("Geolocation not supported by your browser.");
      showPopup("Geolocation is not supported by your browser.");
      return;
    }

    if (!targetBoundary || targetBoundary.length < 3) {
      setLocationStatusMessage("Error: Target boundary not set or invalid (requires at least 3 points).");
      showPopup("Error: Target boundary not properly defined.");
      return;
    }

    setIsVerifyingLocation(true);
    setLocationStatusMessage("Getting your current location... (Please ensure GPS is enabled and you have a clear view of the sky)");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsVerifyingLocation(false);
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentPosition([latitude, longitude]);
        setGpsAccuracy(accuracy);

        // Calculate distance to the first point of the boundary (for display purposes)
        const distToFirstPoint = calculateDistance(
          latitude,
          longitude,
          targetBoundary[0][0],
          targetBoundary[0][1]
        );
        setDistance(distToFirstPoint);

        // Perform the actual boundary check
        const isInBoundary = isPointInPolygon([latitude, longitude], targetBoundary);
        const isAccuracyAcceptable = accuracy <= REQUIRED_GPS_ACCURACY_METERS;

        if (isInBoundary && isAccuracyAcceptable) {
          setLocationVerified(true);
          setLocationStatusMessage(`✅ Physically Verified! You are inside the designated area. (Accuracy: ${accuracy.toFixed(2)}m)`);
          showPopup("Location verified! You are inside the boundaries.");
        } else {
          setLocationVerified(false);
          let errorMessage = `❌ Verification Failed.`;
          if (!isInBoundary) {
            errorMessage += ` You are outside the designated attendance area.`;
          }
          if (!isAccuracyAcceptable) {
            if (!isInBoundary) errorMessage += ` Also,`;
            errorMessage += ` GPS accuracy too low (${accuracy.toFixed(2)}m), required <= ${REQUIRED_GPS_ACCURACY_METERS}m for reliable reading.`;
          }
          setLocationStatusMessage(errorMessage);
          showPopup(errorMessage);
        }
      },
      (error) => {
        setIsVerifyingLocation(false);
        let userFacingError = "Failed to get your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            userFacingError = "Location access denied. Please enable location permissions in your browser/device settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            userFacingError = "Location information is unavailable. Try again in an open area.";
            break;
          case error.TIMEOUT:
            userFacingError = "Getting location timed out. Please try again. Ensure good GPS signal.";
            break;
          default:
            userFacingError = `An unknown location error occurred: ${error.message || JSON.stringify(error)}`;
        }
        setLocationStatusMessage(`Location error: ${userFacingError}`);
        showPopup(`Location error: ${userFacingError}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Start camera stream
  const startCamera = async () => {
    if (isCameraActive || !locationVerified) return;

    try {
      setCameraStatusMessage("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setIsCameraActive(true);
        setCameraStatusMessage("Camera active. Please align your face within the frame.");
      }
    } catch (err) {
      setCameraStatusMessage("Camera access denied. Please allow camera permissions to proceed.");
      showPopup("Camera access denied. Please allow camera permissions.");
    }
  };

  // Capture face (simulate)
  const captureFace = () => {
    if (!isCameraActive || !locationVerified) {
      showPopup("Please complete previous steps first.");
      return;
    }
    setLoadingFace(true);
    setCameraStatusMessage("Verifying face...");
    setTimeout(() => {
      setLoadingFace(false);
      setFaceVerified(true);
      setShowOverallSuccess(true);
      showPopup("😊 Face verified successfully!");
      setCameraStatusMessage("Face verified successfully!");
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setIsCameraActive(false);
      }
    }, 2000);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setIsCameraActive(false);
      }
    };
  }, [cameraStream]);

  // When location is verified, automatically try to start camera
  useEffect(() => {
    if (locationVerified && !faceVerified) {
      startCamera();
    }
  }, [locationVerified, faceVerified]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900 max-w-6xl mx-auto">
      <AnimatePresence>
        {popupMessage && <SuccessPopup message={popupMessage} onClose={() => setPopupMessage("")} />}
      </AnimatePresence>

      {/* Removed Info cards section */}

      {/* Main Verification UI */}
      <div className="bg-white shadow-lg rounded-xl p-8 mt-10"> {/* Added mt-10 for spacing */}
        <h2 className="text-xl font-bold mb-6 text-center text-gray-800">Attendance Verification Steps</h2>
        {/* Stepper */}
        <div className="flex justify-between mb-8 max-w-3xl mx-auto">
          <div className="flex-1 text-center relative">
            <div
              className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
                locationVerified ? "bg-indigo-600 text-white" : "bg-gray-300 text-gray-600"
              }`}
            >
              1
            </div>
            <p className={`mt-2 text-sm font-medium ${locationVerified ? "text-indigo-600" : "text-gray-500"}`}>
              Verify Location
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-full h-1 ${locationVerified ? "bg-indigo-400" : "bg-gray-300"}`}></div>
          </div>
          <div className="flex-1 text-center relative">
            <div
              className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${
                faceVerified
                  ? "bg-indigo-600 text-white"
                  : locationVerified
                  ? "bg-indigo-300 text-indigo-900"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              2
            </div>
            <p
              className={`mt-2 text-sm font-medium ${
                faceVerified
                  ? "text-indigo-600"
                  : locationVerified
                  ? "text-indigo-800"
                  : "text-gray-500"
              }`}
            >
              Verify Face
            </p>
          </div>
        </div>

        {/* Step 1: Location Verification */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-2">Step 1: Location Verification</h3>
          <div className="mb-2">{locationStatusMessage}</div>
          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:bg-gray-300"
            onClick={verifyPhysicalLocation}
            disabled={isVerifyingLocation || locationVerified}
          >
            {isVerifyingLocation ? "Verifying..." : locationVerified ? "Location Verified" : "Verify Location"}
          </button>
          {currentPosition && (
            <div className="mt-2 text-xs text-gray-600">
              Your Coordinates: {currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}
              {typeof distance === "number" && (
                <span> | Distance to Boundary Start: {distance.toFixed(2)}m</span>
              )}
              {typeof gpsAccuracy === "number" && (
                <span> | Accuracy: {gpsAccuracy.toFixed(2)}m</span>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Face Verification */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-2">Step 2: Face Verification</h3>
          <div className="mb-2">{cameraStatusMessage}</div>
          <div className="flex flex-col items-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: 320,
                height: 240,
                borderRadius: 16,
                border: "2px solid #ddd",
                background: "#222",
                marginBottom: 12,
                display: isCameraActive ? "block" : "none",
              }}
            />
            <button
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:bg-gray-300"
              onClick={captureFace}
              disabled={!isCameraActive || loadingFace || faceVerified}
            >
              {loadingFace ? "Verifying..." : faceVerified ? "Face Verified" : "Capture & Verify Face"}
            </button>
          </div>
        </div>

        {/* Success */}
        {showOverallSuccess && (
          <div className="text-center mt-8">
            <div className="text-5xl mb-3">🎉</div>
            <div className="text-xl font-bold text-green-600">Attendance Verified Successfully!</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Changed default export to VerifyLoc
export default VerifyLoc;
