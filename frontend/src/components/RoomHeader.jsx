import Timer from "./Timer";
import "./css/room-header.css";

export default function RoomHeader({
  roomCode,
  roomState,
  gameData,
  user,
  onStartGame,
  onLeaveRoom,
  onSkipWord,
}) {
  console.log(gameData, roomState);
  return (
    <header className="room-header">
      <h1>Room: {roomCode}</h1>

      <div className="header-controls">
        {roomState === "in-game" && gameData && (
          <>
            <div className="game-status">
              {gameData.currentDescriber === user.id && (
                <div className="current-word">
                  <p>
                    Word: <strong>{gameData.wordToGuess?.word}</strong>
                  </p>
                  <button onClick={onSkipWord}>Skip Word</button>
                </div>
              )}

              {gameData.currentTeam && (
                <p className="current-team">
                  Guessing:{" "}
                  {gameData.currentTeam === "red"
                    ? "🔴 Red"
                    : gameData.currentTeam === "blue"
                    ? "🔵 Blue"
                    : gameData.currentTeam}
                </p>
              )}

              <div className="scores">
                <span>🔴 {gameData.teams?.red?.score ?? 0}</span>
                <span>🔵 {gameData.teams?.blue?.score ?? 0}</span>
              </div>
            </div>

            <Timer
              key={`${gameData.currentTeam}-${gameData.turnsPlayed}`}
              seconds={60}
              onComplete={() => console.log("⏰ Turn finished")}
            />
          </>
        )}

        {roomState === "lobby" && (
          <button className="start-button" onClick={onStartGame}>
            Start Game
          </button>
        )}

        <button className="leave-button" onClick={onLeaveRoom}>
          Leave Room
        </button>
      </div>
    </header>
  );
}
