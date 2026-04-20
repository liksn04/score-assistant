import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

const MODAL_STACK_ATTR = 'data-modal-stack-count';
const MODAL_OVERFLOW_ATTR = 'data-modal-original-overflow';

const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  useEffect(() => {
    const currentStackCount = Number(document.body.getAttribute(MODAL_STACK_ATTR) ?? '0');
    const nextStackCount = currentStackCount + 1;

    if (currentStackCount === 0) {
      document.body.setAttribute(MODAL_OVERFLOW_ATTR, document.body.style.overflow);
    }

    document.body.setAttribute(MODAL_STACK_ATTR, String(nextStackCount));
    document.body.style.overflow = 'hidden';

    return () => {
      const updatedStackCount = Math.max(0, Number(document.body.getAttribute(MODAL_STACK_ATTR) ?? '1') - 1);

      if (updatedStackCount === 0) {
        const originalOverflow = document.body.getAttribute(MODAL_OVERFLOW_ATTR) ?? '';

        document.body.removeAttribute(MODAL_STACK_ATTR);
        document.body.removeAttribute(MODAL_OVERFLOW_ATTR);
        document.body.style.overflow = originalOverflow;
        return;
      }

      document.body.setAttribute(MODAL_STACK_ATTR, String(updatedStackCount));
    };
  }, []);

  return createPortal(children, document.body);
};

export default ModalPortal;
