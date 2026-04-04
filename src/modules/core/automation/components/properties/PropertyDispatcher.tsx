import React from 'react';
import { BasePropertyProps } from './types';
import { TriggerProperties } from './TriggerProperties';
import { MessagingProperties } from './MessagingProperties';
import { CRMProperties } from './CRMProperties';
import { LogicProperties } from './LogicProperties';
import { IntegrationProperties } from './IntegrationProperties';
import { InteractionProperties } from './InteractionProperties';
import { BillingProperties, NotificationProperties, VariableProperties, ConversationProperties } from './ModularProperties';
import { ButtonsProperties } from './AdvancedMessagingProperties';
import { EmailProperties, SmsProperties } from './SimpleMessagingProperties';

interface PropertyDispatcherProps extends BasePropertyProps {
    stages: any[];
    availableTags: any[];
}

export function PropertyDispatcher(props: PropertyDispatcherProps) {
    const { node, stages, availableTags } = props;
    if (!node) return null;

    switch (node.type) {
        case 'trigger':
            return <TriggerProperties {...props} />;
        case 'action':
        case 'send_message':
            return <MessagingProperties {...props} />;
        case 'crm':
        case 'tag':
        case 'stage':
            return <CRMProperties {...props} stages={stages} availableTags={availableTags} />;
        case 'condition':
        case 'wait':
        case 'ab_test':
            return <LogicProperties {...props} />;
        case 'http':
        case 'ai_agent':
            return <IntegrationProperties {...props} />;
        case 'wait_input':
            return <InteractionProperties {...props} />;
        case 'billing':
            return <BillingProperties {...props} />;
        case 'notification':
            return <NotificationProperties {...props} />;
        case 'variable':
            return <VariableProperties {...props} />;
        case 'conversation':
            return <ConversationProperties {...props} />;
        case 'buttons':
            return <ButtonsProperties {...props} />;
        case 'email':
            return <EmailProperties {...props} />;
        case 'sms':
            return <SmsProperties {...props} />;
        default:
            return (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-sm text-muted-foreground">Configuración no disponible para este tipo de nodo ({node.type})</p>
                </div>
            );
    }
}
