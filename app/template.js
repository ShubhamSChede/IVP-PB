// Re-mounts on every navigation → gives each page a short native-feeling fade/slide in.
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
