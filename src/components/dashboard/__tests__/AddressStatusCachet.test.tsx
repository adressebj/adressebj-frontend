import { render, screen } from '@testing-library/react';
import { AddressStatusCachet } from '@/components/dashboard/AddressStatusCachet';

describe('AddressStatusCachet', () => {
  it('appose le cachet « Publiée » pour une adresse publiée et active', () => {
    render(<AddressStatusCachet status="PUBLIEE" isActive />);
    expect(screen.getByRole('status', { name: /statut : publiée/i })).toBeInTheDocument();
  });

  it('lit « En attente » pour une adresse en attente de validation', () => {
    render(<AddressStatusCachet status="EN_ATTENTE_VALIDATION" isActive />);
    expect(screen.getByText(/en attente/i)).toBeInTheDocument();
  });

  it('lit « Désactivée » dès que l’adresse est inactive, quel que soit le statut', () => {
    render(<AddressStatusCachet status="PUBLIEE" isActive={false} />);
    expect(screen.getByText(/désactivée/i)).toBeInTheDocument();
  });

  it('lit « Rejetée » pour une adresse rejetée', () => {
    render(<AddressStatusCachet status="REJETEE" isActive />);
    expect(screen.getByText(/rejetée/i)).toBeInTheDocument();
  });
});
