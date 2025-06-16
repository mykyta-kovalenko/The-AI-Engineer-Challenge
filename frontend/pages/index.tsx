import MatrixRain from '../components/MatrixRain';
import TerminalBox from '../components/TerminalBox';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden">
      <MatrixRain />
      <div className="crt-scanlines" />
      <div className="crt-grid" />
      <TerminalBox />
    </div>
  );
}