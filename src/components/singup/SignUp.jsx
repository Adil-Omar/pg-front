import React, { useContext, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import { IoMdEye } from "react-icons/io";
import { IoIosEyeOff } from "react-icons/io";
import { Link } from "react-router-dom";
import { MdKeyboardArrowRight } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "react-toastify";

const SignUp = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(true);

  const { token, setToken, backednUrl } = useContext(AppContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google authentication states
  const [googleData, setGoogleData] = useState(null);
  const [showGooglePasswordPrompt, setShowGooglePasswordPrompt] = useState(false);
  const [googlePassword, setGooglePassword] = useState("");
  const [showGooglePassword, setShowGooglePassword] = useState(false);
  
  // Reset password states
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: code, 3: new password
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const apiUrl = isSignUp
      ? `${backednUrl}/api/auth/signup`
      : `${backednUrl}/api/auth/login`;

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      setTimeout(() => {
        setError("");
      }, 2000);
      return;
    }

    try {
      const response = await axios.post(apiUrl, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (!isSignUp) {
        // For login
        const { email } = formData;

        if (response.data.success) {
          const { user } = response.data;
          console.log(user, "user");

          if (user.email !== email) {
            setError("Email not found.");
            setTimeout(() => {
              setError("");
            }, 2000);
          } else {
            setError("");
            const { token } = response.data;
            console.log(response.data, "login");
            setToken(token);
            console.log(token, "token");

            toast.success("Login successful!");

            localStorage.setItem("token", token);
            navigate("/");
          }
        }
      } else {
        // For signup
        setError("");
        setFormData({ name: "", email: "", password: "", confirmPassword: "" });
        setIsSignUp(false);
        toast.success("SignUp successful!");
      }
    } catch (err) {
      setError(err?.response?.data?.message);
      console.log(err);
      setTimeout(() => {
        setError("");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Custom Google Login using useGoogleLogin hook
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Get user info from Google
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.access_token}`,
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );
        
        const userInfo = await userInfoResponse.json();
        console.log(userInfo);
        
        setGoogleData({
          email: userInfo.email,
          name: userInfo.given_name || userInfo.name,
        });
        setShowGooglePasswordPrompt(true);
      } catch (error) {
        console.error('Error fetching user info:', error);
        toast.error("Failed to get user information from Google");
      }
    },
    onError: () => {
      console.log("Login Failed");
      toast.error("Google authentication failed");
    },
  });

  // Handle Google authentication with password
  const handleGoogleAuth = async (e) => {
    e.preventDefault();
    if (!googlePassword.trim()) {
      setError("Password is required");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setLoading(true);

    const apiUrl = isSignUp
      ? `${backednUrl}/api/auth/signup`
      : `${backednUrl}/api/auth/login`;

    try {
      const response = await axios.post(apiUrl, {
        name: googleData.name,
        email: googleData.email,
        password: googlePassword,
      });

      if (!isSignUp) {
        // For Google login
        if (response.data.success) {
          const { user } = response.data;
          console.log(user, "Google user login");

          if (user.email !== googleData.email) {
            setError("Email not found.");
            setTimeout(() => {
              setError("");
            }, 2000);
          } else {
            setError("");
            const { token } = response.data;
            console.log(response.data, "Google login");
            setToken(token);
            console.log(token, "token");

            toast.success("Google Login successful!");

            localStorage.setItem("token", token);
            
            // Reset Google states
            setGoogleData(null);
            setShowGooglePasswordPrompt(false);
            setGooglePassword("");
            
            navigate("/");
          }
        }
      } else {
        // For Google signup
        setError("");
        toast.success("Google SignUp successful!");
        
        // Reset states and switch to login
        setGoogleData(null);
        setShowGooglePasswordPrompt(false);
        setGooglePassword("");
        setIsSignUp(false);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Authentication failed");
      console.log(err);
      setTimeout(() => {
        setError("");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send reset code to email
  const handleResetStep1 = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError("Email is required");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${backednUrl}/api/auth/reset`, {
        email: resetEmail  // Send email directly, not wrapped in body
      });
      
      if (response.data.success) {
        toast.success("Reset code sent to your email!");
        setResetStep(2);
        setError("");
        // For demo purposes - remove in production
        if (response.data.resetCode) {
          console.log("Reset code (demo):", response.data.resetCode);
        }
      } else {
        setError(response.data.message || "Failed to send reset code");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send reset email");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify reset code
  const handleResetStep2 = async (e) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setError("Reset code is required");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${backednUrl}/api/auth/verify-reset-code`, {
        email: resetEmail,
        code: resetCode
      });
      
      if (response.data.success) {
        toast.success("Code verified successfully!");
        setResetStep(3);
        setError("");
      } else {
        setError(response.data.message || "Invalid reset code");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to verify code");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetStep3 = async (e) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setError("Both password fields are required");
      setTimeout(() => setError(""), 2000);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      setTimeout(() => setError(""), 2000);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${backednUrl}/api/auth/reset-password`, {
        email: resetEmail,
        code: resetCode,
        newPassword: newPassword
      });
      
      if (response.data.success) {
        toast.success("Password reset successfully!");
        handleResetCancel(); // Close modal and reset states
        setError("");
      } else {
        setError(response.data.message || "Failed to reset password");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Google authentication
  const handleGoogleCancel = () => {
    setGoogleData(null);
    setShowGooglePasswordPrompt(false);
    setGooglePassword("");
    setError("");
  };

  // Cancel reset password flow
  const handleResetCancel = () => {
    setShowResetPrompt(false);
    setResetStep(1);
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
  };

  return (
    <>
      <div className="Mycontainer">
        <div className="flex flex-wrap items-center gap-2 text-smallHeader mt-4 text-lg">
          <Link to={"/"} className="flex items-center gap-1">
            <p>Home</p>
            <MdKeyboardArrowRight className="text-xl" />
          </Link>
          <p className="text-smallHeader">signin/signup</p>
        </div>
      </div>
      
      <div className="pt-6 Mycontainer flex lg:flex-nowrap md:flex-nowrap flex-wrap">
        <div className="xl:w-[100%] md:w-[90%] w-full min-h-[300px] lg:min-h-[0px] md:min-h-[300px] bg-signup bg-cover md:bg-right bg-top lg:bg-right bg-no-repeat"></div>

        <div className="bg-white shadow shadow-shadow lg:mt-0 md:mt-0 mt-4 w-[100%]">
          {/* Google Password Prompt Modal */}
          {showGooglePasswordPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  Complete {isSignUp ? 'Google Sign Up' : 'Google Sign In'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Email: <strong>{googleData?.email}</strong>
                  {isSignUp && <><br />Name: <strong>{googleData?.name}</strong></>}
                </p>
                <form onSubmit={handleGoogleAuth}>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-normal mb-2">
                      Enter a password
                    </label>
                    <div className="relative">
                      <input
                        type={showGooglePassword ? "text" : "password"}
                        value={googlePassword}
                        onChange={(e) => setGooglePassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded outline-none"
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-2"
                        onClick={() => setShowGooglePassword(!showGooglePassword)}
                      >
                        {showGooglePassword ? <IoMdEye /> : <IoIosEyeOff />}
                      </button>
                    </div>
                  </div>
                  
                  {error && <p className="text-red-500 mb-4">{error}</p>}
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleCancel}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-smallHeader text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                      {!loading && <FaArrowRight />}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reset Password Modal */}
          {showResetPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  Reset Password - Step {resetStep} of 3
                </h3>
                {resetStep ==2 ||resetStep==3 && <p>2 minutes untill the code expires</p>}

                {/* Step 1: Enter Email */}
                {resetStep === 1 && (
                  <>
                    <p className="text-gray-600 mb-4">
                      Enter your email address and we'll send you a reset code.
                    </p>
                    <form onSubmit={handleResetStep1}>
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-normal mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full px-3 py-2 border rounded outline-none"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      
                      {error && <p className="text-red-500 mb-4">{error}</p>}
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleResetCancel}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-smallHeader text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                          disabled={loading}
                        >
                          {loading ? "Sending..." : "Send Code"}
                          {!loading && <FaArrowRight />}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {/* Step 2: Enter Reset Code */}
                {resetStep === 2 && (
                  <>
                    <p className="text-gray-600 mb-4">
                      Enter the 6-digit code sent to <strong>{resetEmail}</strong>
                    </p>
                    <form onSubmit={handleResetStep2}>
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-normal mb-2">
                          Reset Code
                        </label>
                        <input
                          type="text"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          className="w-full px-3 py-2 border rounded outline-none text-center text-lg tracking-widest"
                          placeholder="000000"
                          maxLength="6"
                          required
                        />
                      </div>
                      
                      {error && <p className="text-red-500 mb-4">{error}</p>}
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setResetStep(1)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                          disabled={loading}
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-smallHeader text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                          disabled={loading}
                        >
                          {loading ? "Verifying..." : "Verify Code"}
                          {!loading && <FaArrowRight />}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {/* Step 3: Set New Password */}
                {resetStep === 3 && (
                  <>
                    <p className="text-gray-600 mb-4">
                      Enter your new password below.
                    </p>
                    <form onSubmit={handleResetStep3}>
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-normal mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded outline-none"
                            placeholder="Enter new password"
                            required
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center px-2"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <IoMdEye /> : <IoIosEyeOff />}
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-normal mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmNewPassword ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded outline-none"
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center px-2"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          >
                            {showConfirmNewPassword ? <IoMdEye /> : <IoIosEyeOff />}
                          </button>
                        </div>
                      </div>
                      
                      {error && <p className="text-red-500 mb-4">{error}</p>}
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setResetStep(2)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                          disabled={loading}
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-smallHeader text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                          disabled={loading}
                        >
                          {loading ? "Resetting..." : "Reset Password"}
                          {!loading && <FaArrowRight />}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between mb-6">
            <button
              className={`px-4 border py-2 w-full text-center ${
                !isSignUp
                  ? "bg-smallHeader text-white"
                  : "bg-line text-gray-700"
              }`}
              onClick={() => setIsSignUp(false)}
            >
              Sign In
            </button>
            <button
              className={`px-4 py-2 w-full text-center ${
                isSignUp
                  ? "bg-smallHeader text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </button>
          </div>
          
          <form className="lg:px-6 md:px-6 px-3" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-normal mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded outline-none"
                />
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-normal mb-2">
                Email Address
              </label>
              <input
                type="text"
                name="email"
                value={formData.email.toLocaleLowerCase()}
                autoComplete="off"
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded outline-none"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-normal mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded outline-none"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IoMdEye /> : <IoIosEyeOff />}
                </button>
              </div>
              {!isSignUp && (
                <label 
                  onClick={() => setShowResetPrompt(true)} 
                  className="block text-blue-800 text-sm font-normal cursor-pointer mt-2 hover:underline"
                >
                  Reset password?
                </label>
              )}
            </div>
            
            {isSignUp && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-normal mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <IoMdEye /> : <IoIosEyeOff />}
                  </button>
                </div>
              </div>
            )}
            
            {isSignUp && (
              <div className="mb-4">
                <label className="flex items-start">
                  <input type="checkbox" required className="mr-2" />
                  <span className="text-gray-600 text-sm max-w-72">
                    Are you agree to Clicon{" "}
                    <span
                      onClick={() => navigate("/terms")}
                      className="text-smallHeader cursor-pointer"
                    >
                      Terms of Condition
                    </span>{" "}
                    and
                    <span
                      onClick={() => navigate("/privacy")}
                      className="text-smallHeader cursor-pointer"
                    >
                      Privacy Policy.
                    </span>
                  </span>
                </label>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-smallHeader flex items-center justify-center gap-2 text-white py-3 rounded hover:bg-indigo-700 focus:outline-none"
              disabled={loading}
            >
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
              {!loading && <FaArrowRight />}
            </button>
            
            {error ? (
              <p className="text-red-500 mt-2">{error}</p>
            ) : (
              <p className="text-white mt-2">{"U"}</p>
            )}
          </form>
          
          <div className="px-3 lg:px-6 md:px-6 pb-5">
            <div className="flex items-center mt-6">
              <hr className="w-full" />
              <p className="px-7 text-minPrice">or</p>
              <hr className="w-full" />
            </div>
            
            <div>
              {/* Custom Google Button - matches Apple button styling exactly */}
              <button
                onClick={() => googleLogin()}
                className="flex items-center justify-center text-gogle rounded gap-3 border border-border2 py-3 w-full cursor-pointer hover:bg-gray-50 mb-3"
              >
                <FcGoogle />
                <p>{isSignUp ? "Sign up" : "Sign in"} with Google</p>
              </button>
              
              <div className="flex items-center justify-center text-gogle rounded gap-3 border border-border2 py-3 w-full cursor-pointer hover:bg-gray-50">
                <SiApple />
                <p>{isSignUp ? "Sign up" : "Sign in"} with Apple</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;