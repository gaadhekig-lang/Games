"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"

interface ConfirmDialogProps {
    trigger?: React.ReactNode
    title: string
    description: string
    actionLabel?: string
    cancelLabel?: string
    onAction: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ConfirmDialog({
    trigger,
    title,
    description,
    actionLabel = "Continue",
    cancelLabel = "Cancel",
    onAction,
    open,
    onOpenChange,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={() => {
                            onAction()
                            onOpenChange?.(false)
                        }}
                    >
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
