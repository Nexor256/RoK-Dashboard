export function AnimatedMesh() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/15 blur-[100px] animate-[blob_7s_infinite]" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/15 blur-[120px] animate-[blob_7s_infinite_2s]" />
      <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-[blob_7s_infinite_4s]" />
    </div>
  );
}
