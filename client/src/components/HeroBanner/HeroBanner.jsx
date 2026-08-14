import React from 'react';
import './HeroBanner.css';

function HeroBanner() {
  // MOCK DATA: Later, Python will send us this array from the database
  const banners = [
    {
      id: 1,
      title: "Summer Collection",
      subtitle: "Discover lightweight fabrics and vibrant colors.",
      image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1200&auto=format&fit=crop"
    },
    {
      id: 2,
      title: "Next-Gen Audio",
      subtitle: "Noise-cancelling headphones tuned by AI.",
      image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1200&auto=format&fit=crop"
    },
    {
      id: 3,
      title: "Smart Living",
      subtitle: "Automate your home with the latest IoT devices.",
      image: "https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1200&auto=format&fit=crop"
    }
  ];

  return (
    <section className="hero-section">
      <div className="hero-scroll-container">
        
        {/* We use '.map()' to loop over the array and stamp out a banner for each one! */}
        {banners.map((banner) => (
          <div 
            key={banner.id} 
            className="hero-slide" 
            style={{ backgroundImage: `url(${banner.image})` }}
          >
            {/* A dark shadow overlay so the white text is always readable against bright images */}
            <div className="hero-gradient-overlay"></div>
            
            <div className="hero-content">
              <h2 className="hero-title">{banner.title}</h2>
              <p className="hero-subtitle">{banner.subtitle}</p>
              <button className="hero-btn">Shop Now</button>
            </div>
          </div>
        ))}

      </div>
    </section>
  );
}

export default HeroBanner;
