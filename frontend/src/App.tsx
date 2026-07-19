import { useState, useEffect } from 'react';
import { MainPage } from './pages/MainPage';
import { PlannerPage } from './pages/PlannerPage';

function App() {
  const [plannerCode, setPlannerCode] = useState<string | null>(null);

  // Sync state with URL query parameter '?planner=XXXXXX'
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('planner');
      setPlannerCode(code);
    };

    // Check on initial load
    handleUrlChange();

    // Listen to popstate event (back/forward browser navigation)
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const navigateToPlanner = (code: string) => {
    const newUrl = `${window.location.origin}${window.location.pathname}?planner=${code}`;
    window.history.pushState({ plannerCode: code }, '', newUrl);
    setPlannerCode(code);
  };

  const navigateToHome = () => {
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ plannerCode: null }, '', newUrl);
    setPlannerCode(null);
  };

  return (
    <div>
      {plannerCode ? (
        <PlannerPage shareCode={plannerCode} onGoBack={navigateToHome} />
      ) : (
        <MainPage onNavigateToPlanner={navigateToPlanner} />
      )}
    </div>
  );
}

export default App;
