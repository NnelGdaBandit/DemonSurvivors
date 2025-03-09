// Initialize Supabase client
const SUPABASE_URL = 'https://wquirdtteetgzzdrwvqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdWlyZHR0ZWV0Z3p6ZHJ3dnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1Mjk0MDMsImV4cCI6MjA1NzEwNTQwM30.ZDvh2p4YLCM7uIptED5qAXYnwqpnr09fvvfD3o0M_t0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to submit score to leaderboard
async function submitScore(playerName, score, survivalTime, level, kills) {
  // Convert all numeric values to integers
  const intScore = Math.floor(score);
  const intSurvivalTime = Math.floor(survivalTime);
  const intLevel = Math.floor(level);
  const intKills = Math.floor(kills);

  console.log('Attempting to submit score:', {
    player_name: playerName,
    score: intScore,
    survival_time: intSurvivalTime,
    level: intLevel,
    kills: intKills
  });

  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .insert([
        { 
          player_name: playerName,
          score: intScore,
          survival_time: intSurvivalTime,
          level: intLevel,
          kills: intKills,
          timestamp: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.error('Error details:', error);
      throw error;
    }
    
    console.log('Score submitted successfully, response data:', data);
    
    // Immediately fetch updated leaderboard data
    await updateLeaderboard();
    return data;
  } catch (error) {
    console.error('Error submitting score:', error);
    console.error('Error details:', {
      message: error.message,
      hint: error.hint,
      details: error.details,
      code: error.code
    });
    return null;
  }
}

// Function to fetch leaderboard data
async function fetchLeaderboard() {
  console.log('Fetching leaderboard data...');
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }

    console.log('Fetched leaderboard data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Function to draw leaderboard section
function drawLeaderboard(x, y) {
  if (!leaderboardData || leaderboardData.length === 0) {
    textAlign(LEFT);
    textSize(24);
    fill(255);
    text("RANKING", x, y);
    textSize(14);
    fill(150);
    text("No scores yet...", x, y + 40);
    return;
  }

  textAlign(LEFT);
  textSize(24);
  fill(255);
  text("RANKING", x, y);
  
  textSize(14);
  let spacing = 25;
  
  for (let i = 0; i < leaderboardData.length; i++) {
    let entry = leaderboardData[i];
    let yPos = y + 40 + (i * spacing);
    
    // Highlight current player's score if it exists
    if (entry.player_name === playerName) {
      fill(255, 200, 0);
    } else {
      fill(200);
    }
    
    text(`${i + 1}. ${entry.player_name.padEnd(15)} ${entry.score.toString().padStart(6)}`, x, yPos);
  }
}

// Function to update leaderboard data
async function updateLeaderboard() {
  console.log('Updating leaderboard...');
  leaderboardData = await fetchLeaderboard();
  console.log('Leaderboard updated:', leaderboardData);
} 