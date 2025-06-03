import React from 'react';

interface TestComponentProps {
  message?: string;
  onClick?: () => void;
}

/**
 * React環境テスト用の簡単なコンポーネント
 */
const TestComponent: React.FC<TestComponentProps> = ({ 
  message = 'React環境が正常に動作しています！', 
  onClick 
}) => {
  return (
    <div>
      <h1 data-testid="test-message">{message}</h1>
      {onClick && (
        <button data-testid="test-button" onClick={onClick}>
          テスト
        </button>
      )}
    </div>
  );
};

export default TestComponent;