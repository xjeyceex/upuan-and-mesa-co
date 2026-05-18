/** Runs before paint — default dark; optional light via localStorage. */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.classList.toggle("light",t==="light");}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
