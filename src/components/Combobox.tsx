import { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = '选择...',
  emptyText = '没有找到匹配的选项',
  allowCustom = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedOption ? selectedOption.label : value ? value : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={(val) => {
              setInputValue(val);
              if (!val && allowCustom) {
                onValueChange('');
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setInputValue(option.label);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
              {allowCustom && inputValue && !options.some((opt) => opt.value.toLowerCase() === inputValue.toLowerCase()) && (
                <CommandItem
                  value={inputValue}
                  onSelect={() => {
                    onValueChange(inputValue);
                    setOpen(false);
                  }}
                >
                  <span className="text-slate-400">使用: </span>
                  {inputValue}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
