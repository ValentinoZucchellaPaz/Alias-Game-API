// src/components/RoomList.jsx
import "./css/room-list.css";
export default function RoomList({ rooms, onJoin }) {
  if (!rooms.length)
    return (
      <div className="text-gray-400 text-center py-12">No rooms available</div>
    );

  return (
    <>
      <h2 className="subheader">Available Rooms</h2>

      <div className="room-list">
        {rooms.map((room) => (
          <div key={room.id} className="room-item">
            <div>
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
    </>
  );
}
