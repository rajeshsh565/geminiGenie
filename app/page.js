import Link from "next/link";

const HomePage = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-base-200 justify-center items-center text-center px-4">
          <h1 className="text-4xl md:text-7xl text-primary font-extrabold">GeminiGenie</h1>
          <p className="my-5 leading-loose text-lg max-w-md">
            Your AI language companion. Powered by Vertex AI, it
            enhances your conversations, content creation, and more!
          </p>
          <Link href="/sign-in" className="btn btn-secondary">Let's Go!</Link>
    </div>
  );
};
export default HomePage;