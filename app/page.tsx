import LocationTypeahead from "./_components/LocationTypeahead";

export default function Home() {
  return (
    <main className="home-shell">
      <div className="home-shell__glow" aria-hidden="true" />
      <div className="home-shell__map" aria-hidden="true" />
      <div className="home-shell__content">
        <div className="home-shell__content-banner">

        </div>
        <p className="eyebrow">Explore everywhere</p>
        <h1>Find your next<br /><span>destination.</span></h1>
        <LocationTypeahead />
      </div>
    </main>
  );
}
