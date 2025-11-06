import "./css/room-list.css";

export default function RoomList({ rooms, onJoin }) {
  if (!rooms.length)
    return (
      <div className="room-list-empty">
        <p>No rooms available</p>
      </div>
    );

  return (
    <div className="room-list-wrapper">
      <h2 className="room-list-title">Available Rooms</h2>

      <div className="room-list">
        {rooms.map((room) => (
          <div key={room.id} className="room-item">
            <div className="room-info">
              <p className="room-name">{room.code}</p>
              <p className="room-players">
                {room.players.filter((p) => p.active).length} / 10 players
              </p>
            </div>
            <button
              className="room-join-button"
              onClick={() => onJoin(room.code)}
            >
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
