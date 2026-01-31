import { cn } from "@/lib/utils";
import * as React from "react";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
	({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onCheckedChange?.(e.target.checked);
			onChange?.(e);
		};

		return (
			<label className="inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					ref={ref}
					className="sr-only peer"
					checked={checked}
					onChange={handleChange}
					{...props}
				/>
				<div
					className={cn(
						"relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
						className
					)}
				/>
			</label>
		);
	}
);
Switch.displayName = "Switch";

export { Switch };
