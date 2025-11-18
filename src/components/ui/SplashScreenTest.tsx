import React, { useState } from 'react';
import SplashScreen from './SplashScreen';

const SplashScreenTest: React.FC = () => {
  const [showSplash, setShowSplash] = useState(false);

  const handleShowSplash = () => {
    setShowSplash(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 5000); // Mostrar por 5 segundos
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Teste do SplashScreen</h2>
      <button 
        onClick={handleShowSplash}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        disabled={showSplash}
      >
        {showSplash ? 'SplashScreen Ativo...' : 'Mostrar SplashScreen'}
      </button>
      
      <SplashScreen 
        isVisible={showSplash} 
        onComplete={() => setShowSplash(false)}
      />
    </div>
  );
};

export default SplashScreenTest;