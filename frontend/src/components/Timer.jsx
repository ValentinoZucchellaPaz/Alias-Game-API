import { useEffect, useState } from "react";

const Timer = ({ seconds, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft === 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  return <div className="timer">{timeLeft} secs.</div>;
};

export default Timer;
