import "./css/team-list.css";
export default function TeamList({ teams, onJoinRed, onJoinBlue }) {
  console.log(teams);
  return (
    <div className="team-list">
      <div className="team-section red">
        <h2>Equipo Rojo 🔴</h2>
        <ul>
          {teams.red.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <button onClick={onJoinRed}>Unirse al Rojo</button>
      </div>

      <div className="team-section blue">
        <h2>Equipo Azul 🔵</h2>
        <ul>
          {teams.blue.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <button onClick={onJoinBlue}>Unirse al Azul</button>
      </div>
    </div>
  );
}
