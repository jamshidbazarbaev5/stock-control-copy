import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useUpdateCurrentUser } from '../api/user';
import { Card, CardContent } from '@/components/ui/card';
import { User, Store, Phone } from 'lucide-react';

interface PasswordUpdateData {
  password: string;
}

interface ProfileUpdateData {
  name: string;
  phone_number: string;
  password: string;
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { data: currentUser, isLoading } = useCurrentUser();
  const updateUser = useUpdateCurrentUser();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const passwordFields = [
    {
      name: 'password',
      label: t('forms.password'),
      type: 'password',
      placeholder: t('placeholders.enter_password'),
      required: true,
    },
  ];

  const profileFields = [
    {
      name: 'name',
      label: t('forms.name'),
      type: 'text',
      placeholder: t('placeholders.enter_name'),
      required: true,
    },
    {
      name: 'phone_number',
      label: t('forms.phone'),
      type: 'text',
      placeholder: t('placeholders.enter_phone'),
      required: true,
    },
    {
      name: 'password',
      label: t('forms.password'),
      type: 'password',
      placeholder: t('placeholders.enter_password'),
      required: true,
    },
  ];

  const handlePasswordUpdate = async (data: PasswordUpdateData) => {
    try {
      await updateUser.mutateAsync({
        password: data.password,
      });
      toast.success(t('messages.success.password_updated'));
      setIsPasswordDialogOpen(false);
    } catch (error) {
    }
  };

  const handleProfileUpdate = async (data: ProfileUpdateData) => {
    try {
      await updateUser.mutateAsync(data);
      toast.success(t('messages.success.profile_updated'));
      setIsProfileDialogOpen(false);
    } catch (error) {
      toast.error(t('messages.error.profile_update'));
      console.error('Failed to update profile:', error);
    }
  };

  if (isLoading || !currentUser) {
    return <div className="container mx-auto py-8 px-4">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('navigation.profile')}</h1>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-lg">{currentUser.name}</h3>
              <div className="flex items-center gap-1 text-gray-500">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{currentUser.phone_number}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Store className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{currentUser.store_read?.name}</span>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 rounded-full 
                  ${currentUser.role.toLowerCase().includes('admin') ? 'bg-blue-100 text-blue-700' : 
                    currentUser.role.toLowerCase().includes('owner') ? 'bg-purple-100 text-purple-700' : 
                    'bg-green-100 text-green-700'}`}
                >
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={() => setIsProfileDialogOpen(true)}>
          {t('common.edit_profile')}
        </Button>
        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
          {t('common.change_password')}
        </Button>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <ResourceForm<PasswordUpdateData>
            fields={passwordFields}
            onSubmit={handlePasswordUpdate}
            isSubmitting={updateUser.isPending}
            title={t('common.change_password')}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <ResourceForm<ProfileUpdateData>
            fields={profileFields}
            onSubmit={handleProfileUpdate}
            isSubmitting={updateUser.isPending}
            title={t('common.edit_profile')}
            defaultValues={{
              name: currentUser.name,
              phone_number: currentUser.phone_number,
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
