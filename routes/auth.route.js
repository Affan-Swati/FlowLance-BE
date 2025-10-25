import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // LOAD .env FIRST!

const router = express.Router();

// CHECK if Google credentials exist
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ GOOGLE OAUTH NOT CONFIGURED - Using dummy credentials');
}

// Google OAuth Strategy - SAFE INITIALIZATION
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Google Auth Callback:', profile.emails[0].value);
    
    // Find or create user
    let user = await User.findOne({ email: profile.emails[0].value });
    
    if (!user) {
      user = await User.create({
        username: profile.displayName || 'Google User',
        email: profile.emails[0].value,
        password: 'google-auth-' + Date.now() // Dummy password
      });
      console.log('✅ New Google user created:', user.email);
    }
    
    done(null, user);
  } catch (err) {
    console.error('❌ Google auth error:', err);
    done(err);
  }
}));

// Serialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      console.log('✅ Google login successful:', req.user.email);
      res.redirect(`http://localhost:5173/auth/callback?token=${token}&userId=${req.user._id}`);
    } catch (err) {
      console.error('❌ Token generation error:', err);
      res.redirect('http://localhost:5173/login?error=auth_failed');
    }
  }
);

export default router;