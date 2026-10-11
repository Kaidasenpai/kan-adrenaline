import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

import { useModal } from "~/providers/modal";

interface Props {
  children: React.ReactNode;
  modalSize?: "sm" | "md" | "lg";
  positionFromTop?: "sm" | "md" | "lg";
  isVisible?: boolean;
  closeOnClickOutside?: boolean;
  centered?: boolean;
}

const Modal: React.FC<Props> = ({
  children,
  modalSize = "sm",
  positionFromTop = "md",
  isVisible,
  closeOnClickOutside,
  centered = false,
}) => {
  const {
    isOpen,
    closeModal,
    closeOnClickOutside: modalCloseOnClickOutside,
  } = useModal();

  const shouldShow = isVisible ?? isOpen;
  const shouldCloseOnClickOutside =
    closeOnClickOutside ?? modalCloseOnClickOutside;

  const modalSizeMap = {
    sm: "max-w-[440px]",
    md: "max-w-[600px]",
    lg: "max-w-[880px]",
  };

  const positionFromTopMap = {
    sm: "clamp(0rem, 4dvh, 2rem)",
    md: "clamp(0rem, 8dvh, 5rem)",
    lg: "clamp(0rem, 16dvh, 10rem)",
  };

  return (
    <Transition.Root show={shouldShow} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={shouldCloseOnClickOutside ? closeModal : () => null}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-interface duration-[180ms]"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-interface duration-[120ms]"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#171A15]/45 transition-opacity dark:bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div
            className={`flex min-h-full justify-center p-4 ${centered ? "items-center" : "items-start"}`}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-interface duration-[180ms]"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-interface duration-[120ms]"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Panel
                className={`adrenaline-modal relative w-full overflow-y-auto overscroll-contain rounded-xl border border-light-300 bg-white text-start text-light-1000 shadow-3xl-light dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:shadow-3xl-dark ${modalSizeMap[modalSize]}`}
                style={{
                  marginTop: centered ? 0 : positionFromTopMap[positionFromTop],
                  maxHeight: centered
                    ? "calc(100dvh - 2rem)"
                    : `calc(100dvh - ${positionFromTopMap[positionFromTop]} - 2rem)`,
                }}
              >
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default Modal;
