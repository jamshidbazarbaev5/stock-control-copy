import { useTranslation } from 'react-i18next';
import { ResourceTable } from '../helpers/ResourseTable';
import { fetchSponsors, deleteSponsor, type Sponsor } from '../api/sponsors';
import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateLoanModal } from '../components/modals/CreateLoanModal';
import { SelectCurrencyModal } from '../components/modals/SelectCurrencyModal';
import { createLoan } from '../api/loan';
import { Button } from '../../components/ui/button';

export default function SponsorsPage() {
  const { t } = useTranslation();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createLoanOpen, setCreateLoanOpen] = useState(false);
  const [selectedSponsorId, setSelectedSponsorId] = useState<number | null>(null);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSponsors();
      setSponsors(data);
    } catch (e) {
      toast.error('Failed to fetch sponsors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    navigate('/create-sponsor');
  };

  const handleEdit = (sponsor: Sponsor) => {
    navigate(`/sponsors/edit/${sponsor.id}`);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSponsor(id);
      toast.success(t('messages.success.deleted', { item: t('navigation.sponsors') }));
      fetchData();
    } catch (e) {
      toast.error('Failed to delete sponsor');
    }
  };

  const handleCreateLoan = useCallback(async (data: { total_amount: number; currency: string; due_date: string; sponsor_write: number }) => {
    if (!selectedSponsorId) return;
    try {
      await createLoan(selectedSponsorId, data);
      toast.success(t('messages.success.created', { item: t('navigation.loan') }));
      fetchData();
    } catch (e) {
    }
  }, [selectedSponsorId]);

  const handleOpenCreateLoan = (sponsorId: number) => {
    setSelectedSponsorId(sponsorId);
    setCreateLoanOpen(true);
  };

  const handleRowClick = (sponsor: Sponsor) => {
    setSelectedSponsorId(sponsor.id!);
    setCurrencyModalOpen(true);
  };

  const handleSelectCurrency = (currency: string) => {
    if (!selectedSponsorId) return;
    navigate(`/sponsors/${selectedSponsorId}/loans/${currency}`);
  };

  const sponsorColumns = [
    {
      accessorKey: 'name',
      header: t('forms.sponsor_name'),
      cell: (sponsor: any) => (
          <div>
            <div>
              <button
                  onClick={() => handleRowClick(sponsor)}
                  className="text-blue-600 hover:underline hover:text-blue-800"
              >
                {sponsor.name}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              {sponsor.phone_number}
            </div>
          </div>
      ),
    },
  ];

  const sponsorActions = (sponsor: Sponsor) => (
      <Button size="sm" variant="outline" onClick={() => handleOpenCreateLoan(sponsor.id!)}>
        {t('Создать займ')}
      </Button>
  );

  return (
      <div className="container py-8 px-4">
        <ResourceTable<Sponsor>
            data={sponsors}
            columns={sponsorColumns}
            isLoading={isLoading}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            totalCount={sponsors.length}
            actions={sponsorActions}
            onRowClick={handleRowClick}
        />
        <CreateLoanModal
            open={createLoanOpen}
            onOpenChange={setCreateLoanOpen}
            sponsorId={selectedSponsorId}
            onCreate={handleCreateLoan}
        />
        <SelectCurrencyModal
            open={currencyModalOpen}
            onOpenChange={setCurrencyModalOpen}
            onSelect={handleSelectCurrency}
        />
      </div>
  );
}
