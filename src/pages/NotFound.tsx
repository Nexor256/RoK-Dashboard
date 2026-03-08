import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Crown } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-6xl font-extrabold text-gradient">404</h1>
        <p className="text-xl text-muted-foreground">Oops! Page not found</p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-lg glow-primary-sm hover:shadow-xl transition-all duration-300"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
