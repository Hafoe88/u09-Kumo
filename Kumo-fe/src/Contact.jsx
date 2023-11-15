import Avatar from "./Avatar";

export default function Contact({
  id,
  userId,
  username,
  online,
  onClick,
  selected,
}) {
  return (
    <div
      onClick={() => onClick(id)}
      key={id}
      className={
        "border-b border-gray-200 flex items-center gap-2 cursor-pointer " +
        (selected ? "bg-sky-200" : "")
      }
    >
      {selected && <div className="w-1  bg-sky-500 h-12 rounded-r-md"></div>}
      <div className="flex gap-2 py-2 pl-4 items-center">
        <Avatar online={online} username={username} userId={id} />
        <span className="text-gray-800">{username}</span>
      </div>
    </div>
  );
}
