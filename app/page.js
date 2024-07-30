import Link from "next/link";

const HomePage = () => {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-7xl text-primary font-extrabold">GeminiGenie</h1>
          <p className="my-5 leading-loose text-lg">
            Your AI language companion. Powered by Vertex AI, it
            enhances your conversations, content creation, and more!
          </p>
          <Link href="/sign-in" className="btn btn-secondary">Let's Go!</Link>
        </div>
      </div>
    </div>
  );
};
export default HomePage;