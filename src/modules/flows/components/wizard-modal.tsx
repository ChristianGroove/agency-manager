import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog'; // Assuming generic UI components
import { useSpacePolicies } from '../hooks/use-space-policies';

interface WizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateId: string;
    onDeploy: (config: any) => void;
}

export function WizardModal({ isOpen, onClose, templateId, onDeploy }: WizardModalProps) {
    const { policy, t } = useSpacePolicies('space_clinic_demo'); // MOCK for viewing
    const [days, setDays] = useState(3);
    const [amount, setAmount] = useState(50);
    const [channel, setChannel] = useState(policy.rules.allowedChannels[0]);

    // CONTENT MAPPING (For the 5 templates)
    // In a real app, this schema comes from the DB Template definition
    const renderContent = () => {
        switch (templateId) {
            case 'payment_recovery':
                return (
                    <div className="text-2xl leading-relaxed font-light text-gray-200">
                        Cuando una factura del <span className="text-blue-400 font-medium">{policy.vocabulary.client}</span> venza por más de
                        <input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="mx-2 w-16 bg-gray-800 border-b-2 border-blue-500 text-center focus:outline-none"
                        />
                        días, si el monto es mayor a
                        <span className="mx-2 text-green-400 font-medium">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="mx-1 w-20 bg-gray-800 border-b-2 border-green-500 text-center focus:outline-none"
                        />
                        , enviar un <span className="text-purple-400 font-medium">Recordatorio Amable</span> por
                        <select
                            value={channel}
                            onChange={(e) => setChannel(e.target.value as any)}
                            className="mx-2 bg-gray-800 border-b-2 border-purple-500 text-center focus:outline-none cursor-pointer"
                        >
                            {policy.rules.allowedChannels.map(c => (
                                <option key={c} value={c}>{c.toUpperCase()}</option>
                            ))}
                        </select>
                        .
                    </div>
                );
            case 'budget_followup':
                return (
                    <div className="text-2xl leading-relaxed font-light text-gray-200">
                        Si no hay respuesta al <span className="text-blue-400 font-medium">Presupuesto</span> después de
                        <input type="number" defaultValue={48} className="mx-2 w-16 bg-gray-800 border-b-2 border-blue-500 text-center focus:outline-none" />
                        horas, enviar un email de <span className="text-purple-400 font-medium">Seguimiento</span>.
                    </div>
                );
            case 'client_reactivation':
                return (
                    <div className="text-2xl leading-relaxed font-light text-gray-200">
                        Si el <span className="text-blue-400 font-medium">{policy.vocabulary.client}</span> lleva inactivo
                        <input type="number" defaultValue={60} className="mx-2 w-16 bg-gray-800 border-b-2 border-amber-500 text-center focus:outline-none" />
                        días, enviar un cupón del
                        <input type="number" defaultValue={15} className="mx-2 w-16 bg-gray-800 border-b-2 border-green-500 text-center focus:outline-none" />
                        % para reactivarlo.
                    </div>
                );
            case 'client_onboarding':
                return (
                    <div className="text-2xl leading-relaxed font-light text-gray-200">
                        Al cerrar un nuevo contrato, enviar <span className="text-pink-400 font-medium">Bienvenida</span> por Email, crear carpeta en
                        <span className="text-green-400 font-medium mx-2">Google Drive</span> y avisar en Slack.
                    </div>
                );
            case 'review_request': // Example of vocabulary injection
                return (
                    <div className="text-2xl leading-relaxed font-light text-gray-200">
                        Cuando finalice el <span className="text-blue-400 font-medium">{policy.vocabulary.project}</span>, esperar
                        <input type="number" defaultValue={2} className="mx-2 w-16 bg-gray-800 border-b-2 border-blue-500 text-center" />
                        días y pedir una reseña al <span className="text-blue-400 font-medium">{policy.vocabulary.client}</span>.
                    </div>
                );
            default:
                return <p>Configuración no disponible para esta plantilla.</p>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-gray-950 border-gray-800 p-8">

                {/* HEADER */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-1">
                        {t("Configurando a tu Asistente de {client}s")}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Pixy automatizará esta tarea basándose en tus reglas.
                    </p>
                </div>

                {/* NARRATIVE FORM */}
                <div className="py-8 border-y border-gray-800">
                    {renderContent()}
                </div>

                {/* FOOTER */}
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onDeploy({ days, amount, channel })}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-all"
                    >
                        Activar Rutina
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
