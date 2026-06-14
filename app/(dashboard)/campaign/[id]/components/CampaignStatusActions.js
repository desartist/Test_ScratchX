'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import ConfirmStatusModal from './ConfirmStatusModal';
import DeleteCampaignModal from './DeleteCampaignModal';
import styles from './CampaignStatusActions.module.css';

export default function CampaignStatusActions({
  campaign,
  onStatusUpdated,
}) {
  const router = useRouter();
  const { account } = useAuthContext();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const validationTimeoutRef = React.useRef(null);

  // Validation rules before activation
  const validateActivation = () => {
    const errors = [];

    if (!campaign.allocated_scratch_cards || campaign.allocated_scratch_cards === 0) {
      errors.push('Please allocate scratches before activating the campaign.');
    }

    if (!campaign.storeAllocations || campaign.storeAllocations.length === 0) {
      errors.push('Please assign at least one store before activating.');
    }

    return errors;
  };

  const setValidationErrorWithTimeout = (message) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    setValidationError(message);
    validationTimeoutRef.current = setTimeout(() => {
      setValidationError(null);
      validationTimeoutRef.current = null;
    }, 5000);
  };

  const handleActionClick = (action) => {
    // Validate activation before opening modal
    if (action === 'activate') {
      const errors = validateActivation();
      if (errors.length > 0) {
        setValidationErrorWithTimeout(errors[0]);
        return;
      }
    }

    // Handle delete with confirmation modal
    if (action === 'delete') {
      setShowDeleteModal(true);
      return;
    }

    setCurrentAction(action);
    setShowModal(true);
  };

  const handleDeleteCampaign = async () => {
    try {
      setDeleteLoading(true);

      if (!account?.id) {
        throw new Error('User authentication required');
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account.id,
        'x-user-role': account.role,
      };

      // Step 1: Remove all store allocations first
      if (campaign.storeAllocations && campaign.storeAllocations.length > 0) {
        for (const allocation of campaign.storeAllocations) {
          try {
            // Use store_id to identify which store allocation to remove
            const storeId = allocation.store_id?._id || allocation.store_id;
            await fetch(`/api/campaigns/${campaign._id}/stores/${storeId}`, {
              method: 'DELETE',
              headers,
            });
          } catch (err) {
            // Continue with other allocations even if one fails
            console.warn('Failed to remove store allocation:', err);
          }
        }
      }

      // Step 2: Delete the campaign
      const response = await fetch(`/api/campaigns/${campaign._id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete campaign');
      }

      // Redirect to campaigns list after successful delete
      setShowDeleteModal(false);
      router.push('/campaign');
    } catch (err) {
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const handleStatusUpdate = async () => {
    if (!account?.id) {
      throw new Error('User authentication required');
    }

    const statusMap = {
      activate: 'active',
      pause: 'paused',
      resume: 'active',
      end: 'ended',
    };

    const newStatus = statusMap[currentAction];
    if (!newStatus) throw new Error('Invalid action');

    const response = await fetch(`/api/campaigns/${campaign._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': account.id,
        'x-user-role': account.role,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update campaign status');
    }

    const updatedCampaign = await response.json();

    // Fetch the enriched campaign with storeAllocations
    const detailResponse = await fetch(`/api/campaigns/${campaign._id}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': account.id,
        'x-user-role': account.role,
      },
    });

    if (detailResponse.ok) {
      const fullCampaign = await detailResponse.json();
      if (onStatusUpdated) {
        onStatusUpdated(fullCampaign.data || fullCampaign);
      }
    } else {
      // Fallback: use the partial response if detail fetch fails
      if (onStatusUpdated) {
        onStatusUpdated(updatedCampaign.data || updatedCampaign);
      }
    }
  };

  const getVisibleActions = () => {
    const status = campaign?.status?.toLowerCase();

    switch (status) {
      case 'draft':
        return [
          { label: 'Activate Campaign', action: 'activate', type: 'primary' },
          { label: 'Delete', action: 'delete', type: 'danger' },
        ];
      case 'active':
        return [
          { label: 'Pause Campaign', action: 'pause', type: 'secondary' },
          { label: 'End Campaign', action: 'end', type: 'danger' },
        ];
      case 'paused':
        return [
          { label: 'Resume Campaign', action: 'resume', type: 'primary' },
          { label: 'End Campaign', action: 'end', type: 'danger' },
        ];
      case 'ended':
        return []; // No actions available for ended campaigns
      default:
        return [];
    }
  };

  const actions = getVisibleActions();

  return (
    <>
      <div className={styles.container}>
        {validationError && (
          <div className={styles.validationError}>
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => router.push(`/campaign/${campaign._id}/edit`)}
            title="Edit campaign details"
          >
            ✎ Edit Campaign
          </button>

          {campaign?.status?.toLowerCase() === 'active' && (
            <button
              className={`${styles.btn} ${styles.primaryBtn}`}
              onClick={() => router.push(`/campaign/${campaign._id}/live`)}
              title="View live QR code"
            >
              🔗 View Live QR
            </button>
          )}

          {actions.map((actionBtn) => (
            <button
              key={actionBtn.action}
              className={`${styles.btn} ${styles[`${actionBtn.type}Btn`]}`}
              onClick={() => handleActionClick(actionBtn.action)}
              title={actionBtn.label}
            >
              {actionBtn.label}
            </button>
          ))}

          {campaign?.status?.toLowerCase() === 'ended' && (
            <div className={styles.endedMessage}>
              Campaign Ended
            </div>
          )}
        </div>
      </div>

      <ConfirmStatusModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        action={currentAction}
        campaignName={campaign?.campaignName}
        onConfirm={handleStatusUpdate}
      />

      <DeleteCampaignModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        campaignName={campaign?.campaignName}
        storeCount={campaign?.storeAllocations?.length || 0}
        onConfirm={handleDeleteCampaign}
      />
    </>
  );
}
