export default function Logo() {
  return (
    <div className="text-sky-500 font-bold flex gap-2 p-2">
      <div>
        {" "}
        <img src="/logo.png" alt="logo" className="mx-auto h-12 w-12" />
      </div>
      <div className="items-center flex">
        <p>Kumo</p>
      </div>
    </div>
  );
}
