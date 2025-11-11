import "./css/team-list.css";
export default function TeamList({ teams, onJoinRed, onJoinBlue, user }) {
  return (
    <div className="team-list">
      <div className="team-section red">
        <h2>Red Team 🔴</h2>
        <ul>
          {teams.red.map((p) => (
            <li key={p}>
              {p} {user?.id == p && " (you)"}
            </li>
          ))}
        </ul>
        <button onClick={onJoinRed}>Join</button>
      </div>

      <div className="team-section blue">
        <h2>Blue Team 🔵</h2>
        <ul>
          {teams.blue.map((p) => (
            <li key={p}>
              {p} {user?.id == p && " (you)"}
            </li>
          ))}
        </ul>
        <button onClick={onJoinBlue}>Join</button>
      </div>
    </div>
  );
}
