import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Circle, Award, BarChart2, Book, Activity } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';

const HabitTracker = () => {
  // Initial state with sample data
  const [habits, setHabits] = useState([
    { id: 1, name: 'Exercise (30+ min)', category: 'Physical', completed: false, details: '', icon: 'Activity' },
    { id: 2, name: 'AI Agents Study', category: 'Learning', completed: false, details: '', icon: 'Book' },
    { id: 3, name: 'Algorithm Practice', category: 'Learning', completed: false, details: '', icon: 'Book' },
    { id: 4, name: 'General Knowledge/Side projects', category: 'Learning', completed: false, details: '', icon: 'Book' },
  ]);

  const [achievements, setAchievements] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState({});
  const [streaks, setStreaks] = useState({ exercise: 0, learning: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format date as string key
  const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load habits list
        const habitsDoc = await getDoc(doc(db, 'habits', 'habitsList'));
        if (habitsDoc.exists()) {
          setHabits(habitsDoc.data().habits);
        }

        // Load history
        const historyCollection = collection(db, 'history');
        const historySnapshot = await getDocs(historyCollection);
        const historyData = {};

        historySnapshot.forEach(doc => {
          historyData[doc.id] = doc.data();
        });

        setHistory(historyData);

        // Calculate streaks based on the loaded history
        if (Object.keys(historyData).length > 0 && habits.length > 0) {
          calculateStreaks(habits, historyData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading data from Firebase:", error);
        setError("Failed to load your data. Please refresh the page and try again.");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save habits to Firebase whenever they change
  useEffect(() => {
    if (!loading) {
      const saveHabits = async () => {
        try {
          await setDoc(doc(db, 'habits', 'habitsList'), { habits });
        } catch (error) {
          console.error("Error saving habits to Firebase:", error);
          setError("Failed to save your habits. Please try again later.");
        }
      };

      saveHabits();
    }
  }, [habits, loading]);

  // Calculate streaks
  const calculateStreaks = (currentHabits, historyData) => {
    let exerciseStreak = 0;
    let learningStreak = 0;

    // Get dates and sort them
    const dates = Object.keys(historyData).sort();
    if (dates.length === 0) return;

    // Get latest date
    const latestDate = new Date();
    latestDate.setHours(0, 0, 0, 0);

    // Check if any exercise habits are completed today
    const exerciseHabits = currentHabits.filter(h => h.category === 'Physical');
    const exerciseCompletedToday = exerciseHabits.some(h => h.completed);

    // Check if any learning habits are completed today
    const learningHabits = currentHabits.filter(h => h.category === 'Learning');
    const learningCompletedToday = learningHabits.some(h => h.completed);

    // Calculate streaks
    for (let i = dates.length - 1; i >= 0; i--) {
      const dateStr = dates[i];
      const date = new Date(dateStr);
      const dayData = historyData[dateStr];

      // Check if this date is consecutive with latestDate
      const diffTime = Math.abs(latestDate - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) break;

      // Update latestDate for next iteration
      latestDate.setDate(latestDate.getDate() - 1);

      // Check exercise habits
      const exerciseCompleted = Object.entries(dayData.habits || {}).some(([id, completed]) => {
        const habit = currentHabits.find(h => h.id.toString() === id);
        return habit && habit.category === 'Physical' && completed;
      });

      if (exerciseCompleted || (i === dates.length - 1 && exerciseCompletedToday)) {
        exerciseStreak++;
      } else {
        break;
      }
    }

    // Reset latestDate for learning streak calculation
    latestDate.setTime(new Date().setHours(0, 0, 0, 0));

    // Calculate learning streak
    for (let i = dates.length - 1; i >= 0; i--) {
      const dateStr = dates[i];
      const date = new Date(dateStr);
      const dayData = historyData[dateStr];

      // Check if this date is consecutive with latestDate
      const diffTime = Math.abs(latestDate - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) break;

      // Update latestDate for next iteration
      latestDate.setDate(latestDate.getDate() - 1);

      // Check learning habits
      const learningCompleted = Object.entries(dayData.habits || {}).some(([id, completed]) => {
        const habit = currentHabits.find(h => h.id.toString() === id);
        return habit && habit.category === 'Learning' && completed;
      });

      if (learningCompleted || (i === dates.length - 1 && learningCompletedToday)) {
        learningStreak++;
      } else {
        break;
      }
    }

    setStreaks({ exercise: exerciseStreak, learning: learningStreak });
  };

  // Toggle habit completion
  const toggleHabit = async (id) => {
    const updatedHabits = habits.map(habit =>
      habit.id === id ? { ...habit, completed: !habit.completed } : habit
    );
    setHabits(updatedHabits);

    // Update history
    const newHistory = { ...history };
    if (!newHistory[dateKey]) {
      newHistory[dateKey] = { habits: {}, habitDetails: {}, achievements: '' };
    }

    newHistory[dateKey].habits = updatedHabits.reduce((acc, habit) => {
      acc[habit.id] = habit.completed;
      return acc;
    }, {});

    newHistory[dateKey].habitDetails = updatedHabits.reduce((acc, habit) => {
      acc[habit.id] = habit.details;
      return acc;
    }, {});

    setHistory(newHistory);

    // Save to Firebase
    try {
      await setDoc(doc(db, 'history', dateKey), newHistory[dateKey]);

      // Update streaks
      calculateStreaks(updatedHabits, newHistory);
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      setError("Failed to save your progress. Please try again.");
    }
  };

  // Update habit details
  const updateHabitDetails = async (id, details) => {
    const updatedHabits = habits.map(habit =>
      habit.id === id ? { ...habit, details } : habit
    );
    setHabits(updatedHabits);

    // Update history
    const newHistory = { ...history };
    if (!newHistory[dateKey]) {
      newHistory[dateKey] = { habits: {}, habitDetails: {}, achievements: '' };
    }

    newHistory[dateKey].habitDetails = updatedHabits.reduce((acc, habit) => {
      acc[habit.id] = habit.details;
      return acc;
    }, {});

    setHistory(newHistory);

    // Save to Firebase
    try {
      await setDoc(doc(db, 'history', dateKey), newHistory[dateKey]);
    } catch (error) {
      console.error("Error saving details to Firebase:", error);
      setError("Failed to save your notes. Please try again.");
    }
  };

  // Save achievements
  const saveAchievements = async () => {
    const newHistory = { ...history };
    if (!newHistory[dateKey]) {
      newHistory[dateKey] = { habits: {}, habitDetails: {}, achievements: '' };
    }

    newHistory[dateKey].achievements = achievements;
    setHistory(newHistory);

    // Save to Firebase
    try {
      await setDoc(doc(db, 'history', dateKey), newHistory[dateKey]);
    } catch (error) {
      console.error("Error saving achievements to Firebase:", error);
      setError("Failed to save your achievements. Please try again.");
    }
  };

  // Date navigation
  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);

    // Load data for the selected date
    const newDateKey = `${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`;

    if (history[newDateKey]) {
      // Load habits from history
      const savedHabits = { ...history[newDateKey].habits };
      const savedHabitDetails = history[newDateKey].habitDetails || {};

      const updatedHabits = habits.map(habit => ({
        ...habit,
        completed: savedHabits[habit.id] || false,
        details: savedHabitDetails[habit.id] || '',
      }));

      setHabits(updatedHabits);
      setAchievements(history[newDateKey].achievements || '');
    } else {
      // Reset for new date without clearing details
      const resetHabits = habits.map(habit => ({
        ...habit,
        completed: false,
      }));

      setHabits(resetHabits);
      setAchievements('');
    }
  };

  // Add new habit
  const addHabit = async () => {
    const newId = Math.max(0, ...habits.map(h => h.id)) + 1;
    const newHabit = {
      id: newId,
      name: 'New Habit',
      category: 'Physical',
      completed: false,
      details: '',
      icon: 'Circle'
    };

    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);

    // Save will happen in the useEffect
  };

  // Delete habit
  const deleteHabit = async (id) => {
    const updatedHabits = habits.filter(habit => habit.id !== id);
    setHabits(updatedHabits);

    // Save will happen in the useEffect
  };

  // Render icon component based on string name
  const renderIcon = (iconName, size = 20) => {
    switch(iconName) {
      case 'Activity': return <Activity size={size} />;
      case 'Book': return <Book size={size} />;
      case 'BarChart2': return <BarChart2 size={size} />;
      case 'Award': return <Award size={size} />;
      default: return <Circle size={size} />;
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    if (habits.length === 0) return 0;
    const completed = habits.filter(h => h.completed).length;
    return Math.round((completed / habits.length) * 100);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl font-medium text-indigo-700">Loading your habits...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <p className="text-xl font-medium text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-4 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-indigo-700 mb-2">Personal Empowerment Tracker</h1>

        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="bg-indigo-100 p-2 rounded hover:bg-indigo-200"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" />
            <span className="font-medium">{formatDate(currentDate)}</span>
          </div>

          <button
            onClick={() => changeDate(1)}
            className="bg-indigo-100 p-2 rounded hover:bg-indigo-200"
          >
            Next
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-indigo-600" />
            <h2 className="font-bold">Physical Streak</h2>
            <span className="ml-auto bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">
              {streaks.exercise} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: `${Math.min(streaks.exercise * 3, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <Book size={20} className="text-purple-600" />
            <h2 className="font-bold">Learning Streak</h2>
            <span className="ml-auto bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
              {streaks.learning} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${Math.min(streaks.learning * 3, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Daily Habits</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Today's Progress:</span>
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-sm">
              {calculateCompletion()}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {habits.map(habit => (
            <div key={habit.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className="mt-1 flex-shrink-0"
                >
                  {habit.completed ? (
                    <CheckCircle size={22} className="text-green-500" />
                  ) : (
                    <Circle size={22} className="text-gray-300" />
                  )}
                </button>

                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    {renderIcon(habit.icon)}
                    <input
                      type="text"
                      value={habit.name}
                      onChange={(e) => {
                        const updatedHabits = habits.map(h =>
                          h.id === habit.id ? { ...h, name: e.target.value } : h
                        );
                        setHabits(updatedHabits);
                      }}
                      className="font-medium text-gray-800 border-none focus:ring-0 p-0 bg-transparent flex-grow"
                    />

                    <select
                      value={habit.category}
                      onChange={(e) => {
                        const updatedHabits = habits.map(h =>
                          h.id === habit.id ? { ...h, category: e.target.value } : h
                        );
                        setHabits(updatedHabits);
                      }}
                      className="text-xs border rounded p-1 bg-gray-50"
                    >
                      <option value="Physical">Physical</option>
                      <option value="Learning">Learning</option>
                      <option value="Other">Other</option>
                    </select>

                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>

                  <textarea
                    placeholder={`Notes about your ${habit.name.toLowerCase()}...`}
                    value={habit.details}
                    onChange={(e) => updateHabitDetails(habit.id, e.target.value)}
                    className="mt-2 w-full text-sm border rounded p-2 h-20 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addHabit}
            className="w-full py-2 bg-indigo-100 rounded-lg text-indigo-700 hover:bg-indigo-200 font-medium"
          >
            + Add New Habit
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Daily Achievements</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-2">
            Record what you've accomplished today, no matter how small. This helps combat the feeling that you haven't done enough.
          </p>
          <textarea
            placeholder="Today I achieved..."
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            className="w-full border rounded p-3 h-36 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={saveAchievements}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Achievements
          </button>
        </div>
      </div>

      <footer className="mt-auto text-center text-sm text-gray-500 pt-8">
        <p>Your data is saved securely in the cloud.</p>
        <p className="mt-1">Keep tracking your progress to build lasting habits!</p>
      </footer>
    </div>
  );
};

export default HabitTracker;