import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Hero } from '../components/home/Hero';
import { Features } from '../components/home/Features';
import { HowItWorks } from '../components/home/HowItWorks';
import { Footer } from '../components/home/Footer';

export const Home = () => {
  return (
    <div className="min-h-screen flex flex-col bg-light-background text-light-foreground dark:bg-dark-background dark:text-dark-foreground transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};
