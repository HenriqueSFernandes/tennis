// Form validation hook

import { useCallback, useState } from "react";

type FieldName = string;

interface ValidationRule {
  field: FieldName;
  validate: (value: string) => string | undefined;
}

interface UseFormValidationOptions<T> {
  initialValues: T;
  rules: ValidationRule[];
}

export function useFormValidation<T>({
  initialValues,
  rules,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const validateField = useCallback(
    (field: FieldName, value: string): string | undefined => {
      const rule = rules.find((r) => r.field === field);
      if (!rule) return undefined;
      return rule.validate(value);
    },
    [rules],
  );

  const handleChange = useCallback(
    (field: FieldName, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }) as T);
      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [touched, validateField],
  );

  const handleBlur = useCallback(
    (field: FieldName) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(
        field,
        (values as Record<string, string>)[field] ?? "",
      );
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField, values],
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<FieldName, string>> = {};
    const newTouched: Partial<Record<FieldName, boolean>> = {};
    const stringValues = values as Record<string, string>;

    for (const rule of rules) {
      const value = stringValues[rule.field] ?? "";
      const error = rule.validate(value);
      if (error) {
        newErrors[rule.field] = error;
      }
      newTouched[rule.field] = true;
    }

    setErrors(newErrors);
    setTouched((prev) => ({ ...prev, ...newTouched }));

    return Object.keys(newErrors).length === 0;
  }, [rules, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setErrors({});
  }, [initialValues]);

  return {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setTouched,
  };
}
