'use client';

import { useState } from 'react';
import ProfileView from './ProfileView';
import ProfileEditForm from './ProfileEditForm';
import { useRouter } from 'next/navigation';

interface ProfileManagerProps {
  adminData: any;
  userEmail: string;
  userId: string;
  regions: any[];
  cities: any[];
}

export default function ProfileManager({
  adminData,
  userEmail,
  userId,
  regions,
  cities,
}: ProfileManagerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const router = useRouter();

  const handleSaved = () => {
    setIsEditMode(false);
    router.refresh(); // Recargar datos del servidor
  };

  return (
    <>
      {isEditMode ? (
        <ProfileEditForm
          adminData={adminData}
          userEmail={userEmail}
          userId={userId}
          regions={regions}
          cities={cities}
          onCancel={() => setIsEditMode(false)}
          onSaved={handleSaved}
        />
      ) : (
        <ProfileView
          adminData={adminData}
          userEmail={userEmail}
          onEdit={() => setIsEditMode(true)}
        />
      )}
    </>
  );
}
