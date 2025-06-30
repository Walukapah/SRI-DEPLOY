// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [bots, setBots] = useState([]);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => setBots(data));
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = showLogin ? '/api/login' : '/api/register';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    if (data.success) {
      setUser(data.user);
    }
  };

  const deployBot = async (botName) => {
    const response = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email, botName })
    });
    
    const data = await response.json();
    if (data.success) {
      alert(`Bot ${botName} deployed successfully! Deployment ID: ${data.deploymentId}`);
      // Update user data
      setUser({ ...user, bots: [...user.bots, botName] });
    }
  };

  return (
    <div className="container">
      <Head>
        <title>WhatsApp Bot Deployer</title>
      </Head>

      <main>
        <h1>WhatsApp Bot Deployer</h1>
        
        {!user ? (
          <div className="auth-form">
            <h2>{showLogin ? 'Login' : 'Register'}</h2>
            <form onSubmit={handleAuth}>
              {!showLogin && (
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button type="submit">{showLogin ? 'Login' : 'Register'}</button>
            </form>
            <button onClick={() => setShowLogin(!showLogin)}>
              {showLogin ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
          </div>
        ) : (
          <div className="dashboard">
            <h2>Welcome, {user.username}!</h2>
            <p>Your deployed bots: {user.bots.length}/1</p>
            
            <div className="bot-grid">
              {bots.map((bot) => (
                <div key={bot.name} className="bot-card">
                  <img src={bot.logo} alt={bot.name} />
                  <h3>{bot['bot-name'] || bot.name}</h3>
                  <p>{bot.description}</p>
                  <div className="env-vars">
                    {bot.env && Object.entries(bot.env).map(([key, val]) => (
                      <div key={key}>
                        <label>{key}:</label>
                        <input type="text" placeholder={val.description} />
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => deployBot(bot.name)}
                    disabled={user.bots.length >= 1}
                  >
                    {user.bots.includes(bot.name) ? 'Deployed' : 'Deploy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 2rem;
        }
        .bot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }
        .bot-card {
          border: 1px solid #ddd;
          padding: 1rem;
          border-radius: 8px;
        }
        .bot-card img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }
        .env-vars {
          margin: 1rem 0;
        }
        .env-vars label {
          display: block;
          font-weight: bold;
        }
        .env-vars input {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
