"use client";

import { BookOpen } from 'lucide-react';
import Card from "../components/card";
import { useState } from 'react';
import { toast } from "sonner"

export default function Home() {

  const [email, setEmail] = useState('');

  const handleSubscribe = () => {
      fetch('/api/subscribe', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
      })
      .then(response => response.json())
      .then(data => {
          console.log(data.message);
          toast.success('Subscribed successfully!');
      })
      .catch(error => {
          console.error('Error:', error);
          toast.error('Subscription failed. Please try again.');
      }).finally(() => {
          setEmail('');
      });
  }

  return (
    <div className="bg-white min-h-screen text-black">
      {/* header */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <BookOpen/>
          <h1 className="text-2xl font-bold">Daily News</h1>
        </div>
        <nav className="flex items-center gap-6">
          <a href="/" className="hover:text-gray-500">About</a>
          <a href="/" className="hover:text-gray-500">Contact</a>
        </nav>
      </header>

      {/* main content */}
      <div className="max-w-7xl mx-auto px-8 py-32">
        {/* title */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">LennyFace's AI</h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-related">
            SUper COol Ai generated news
          </p>
        </div>

        {/* input and subscribe button */}
        <div className="flex text-center items-center justify-center gap-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full max-w-md p-3 rounded-lg border
          border-gray-300 focus:outline-none focus:ring-blue-500" />
          <button onClick={handleSubscribe} className="bg-black text-white px-6 py-3 rounded-lg hover:bg-blue-400 
          transition-colors">Subscribe</button>
        </div>

        {/* cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <Card 
            title="AI"
            description="Artificial Intelligence is transforming the way news is gathered, reported, and consumed, leading to faster and more accurate journalism."
          />
          <Card 
            title="Startups"
            description="A cutting-edge AI tool has been developed to analyze vast amounts of data and predict emerging news trends with remarkable accuracy."
          />
          <Card 
            title="Tech"
            description="As AI becomes more prevalent in journalism, experts are debating the ethical considerations surrounding its use in news reporting."
          />
        </div>
      </div>
    </div>
  );
}