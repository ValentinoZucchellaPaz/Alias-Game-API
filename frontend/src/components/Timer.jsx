import { useEffect, useState } from "react";

const Timer = ({ seconds, resetKey, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  // reset cuando cambia el turno o segundos
  useEffect(() => {
    setTimeLeft(seconds);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (timeLeft === 0) {
      onComplete();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  return <div className="timer">{timeLeft} secs.</div>;
};

export default Timer;
