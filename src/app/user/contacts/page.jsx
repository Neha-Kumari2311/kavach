'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import Link from 'next/link';
import UserDashboardHeader from '@/components/dashboard/UserDashboardHeader';
import { useSafetyScore } from '@/hooks/useSafetyScore';

export default function ContactsPage() {
  const router = useRouter();
   const { data: session } = useSession(); 
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');

  // Safety score from shared context
  const { safetyScore, safetyLabel, safetyColor, loading: safetyLoading } = useSafetyScore();

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trusted-contacts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contacts');
      }

      setContacts(data.contacts || []);
      setError('');
    } catch (err) {
      console.error('Fetch contacts error:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !phone.trim() || !relation.trim()) {
      setError('Please fill in all fields (Email is optional)');
      return;
    }

    try {
      const response = await fetch('/api/trusted-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          relation: relation.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add contact');
      }

      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setRelation('');
      setIsAdding(false);
      setSuccess('Contact added successfully!');

      // Refresh contacts list
      fetchContacts();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Add contact error:', err);
      setError(err.message || 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to remove this contact?')) {
      return;
    }

    try {
      const response = await fetch(`/api/trusted-contacts/${contactId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete contact');
      }

      setSuccess('Contact removed successfully!');
      
      // Refresh contacts list
      fetchContacts();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Delete contact error:', err);
      setError(err.message || 'Failed to delete contact');
    }
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    
    <div className="bg-[#f7f6f8] dark:bg-[#181121] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <UserDashboardHeader
        userName={session?.user?.name || "User"}
        safetyScore={safetyScore}
        safetyLabel={safetyLabel}
        safetyColor={safetyColor}
        safetyLoading={safetyLoading}
        onNotificationClick={() => router.push("/user/notifications")}
      />
      <main className="flex-1 px-4 pb-24 max-w-md mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Trusted Contacts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your emergency contacts
            </p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="size-10 rounded-full bg-[#8b47eb] text-white flex items-center justify-center shadow-lg shadow-[#8b47eb]/20 hover:bg-[#8b47eb]/90 transition-colors"
          >
            <span className="material-symbols-outlined">
              {isAdding ? "close" : "add"}
            </span>
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
              check_circle
            </span>
            <p className="text-sm text-green-600 dark:text-green-400 flex-1">
              {success}
            </p>
            <button
              onClick={() => setSuccess("")}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">
              error
            </span>
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">
              {error}
            </p>
            <button
              onClick={() => setError("")}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Add Contact Form */}
        {isAdding && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Add New Contact
            </h2>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  placeholder="+91 9876543210"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="contact@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Relation
                </label>
                <input
                  type="text"
                  value={relation}
                  onChange={(e) => {
                    setRelation(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g., Mom, Dad, Friend"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setName("");
                    setPhone("");
                    setRelation("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#8b47eb] text-white font-semibold hover:bg-[#8b47eb]/90 transition-colors"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contacts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-[#8b47eb] text-4xl">
              sync
            </span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm border border-slate-100 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-400 text-6xl mb-4 block">
              contacts
            </span>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              No trusted contacts yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Add contacts to notify them during emergencies
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-12 rounded-full bg-[#8b47eb]/10 border-2 border-[#8b47eb]/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#8b47eb] text-2xl">
                      person
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {contact.relation}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                      {contact.phone}
                    </p>
                    {contact.email && (
                      <p className="text-sm text-[#8b47eb] mt-0.5 truncate">
                        {contact.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCall(contact.phone)}
                    className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    title="Call"
                  >
                    <span className="material-symbols-outlined">call</span>
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="size-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-6 py-3 z-50">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <Link
            href="/user/dashboard"
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/user/dashcam"
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
          >
            <span className="material-symbols-outlined">videocam</span>
            <span className="text-[10px] font-medium">Dashcam</span>
          </Link>
          <Link
            href="/user/store"
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="text-[10px] font-medium">Store</span>
          </Link>
          
        </div>
      </nav>
    </div>
  );
}
