import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GroupCard } from '../components/groups/GroupCard';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { AddMemberModal } from '../components/groups/AddMemberModal';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';

export const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupForMember, setSelectedGroupForMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGroups();
      setGroups(data.groups || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (name, memberEmails = []) => {
    const res = await api.createGroup(name);
    const newGroupId = res.group?.id;

    if (newGroupId && memberEmails.length > 0) {
      for (const email of memberEmails) {
        try {
          await api.addMember(newGroupId, email);
        } catch (err) {
          console.warn(`Could not add member ${email}:`, err);
        }
      }
    }

    await fetchGroups();
    if (newGroupId) {
      navigate(`/groups/${newGroupId}`);
    }
    return res;
  };

  const handleAddMemberToGroup = async (email) => {
    if (!selectedGroupForMember) return;
    await api.addMember(selectedGroupForMember.id, email);
    await fetchGroups();
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
            My Groups
          </h1>
          <p className="text-xs md:text-sm text-light-muted dark:text-dark-muted mt-0.5">
            Manage your shared expense groups and members
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Create New Group
        </Button>
      </div>

      {/* Search Bar */}
      {groups.length > 0 && (
        <div className="max-w-md w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full px-4 py-2.5 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-card"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Fetching your groups..." />
      ) : error ? (
        <ErrorState title="Failed to Load Groups" message={error} onRetry={fetchGroups} />
      ) : filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onAddMemberClick={(g) => setSelectedGroupForMember(g)}
            />
          ))}
        </div>
      ) : groups.length > 0 ? (
        <EmptyState
          title="No matching groups"
          description={`No groups match "${search}"`}
          actionLabel="Clear Search"
          onAction={() => setSearch('')}
        />
      ) : (
        <EmptyState
          title="No groups created yet"
          description="Create a group to start sharing and splitting expenses with your friends or flatmates."
          actionLabel="Create Your First Group"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateGroup}
      />

      {/* Add Member Modal */}
      {selectedGroupForMember && (
        <AddMemberModal
          isOpen={!!selectedGroupForMember}
          onClose={() => setSelectedGroupForMember(null)}
          onAddMember={handleAddMemberToGroup}
        />
      )}
    </div>
  );
};

