import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const userParam = searchParams.get("user");

    if (!token) {
      navigate("/login?error=google_auth_failed", { replace: true });
      return;
    }

    localStorage.setItem("mulaqat_token", token);

    if (userParam) {
      try {
        const user = JSON.parse(userParam);
        localStorage.setItem("mulaqat_user", JSON.stringify(user));
      } catch (error) {
        console.error("Failed to parse Google user:", error);
      }
    }

    navigate("/", { replace: true });
  }, [navigate, searchParams]);

  return (
    <div>
      <h2>Signing you in...</h2>
      <p>Please wait...</p>
    </div>
  );
};

export default GoogleCallback;