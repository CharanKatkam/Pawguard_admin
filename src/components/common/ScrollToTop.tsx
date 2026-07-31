import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window to top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Scroll main layout container to top if present
    const mainContainer = document.querySelector("main");
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
