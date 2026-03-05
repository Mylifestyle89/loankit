import { useCallback } from "react";
import {
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMappingDataStore } from "../stores/use-mapping-data-store";

export function useDragAndDrop() {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const { fieldCatalog: cat, setFieldCatalog } = useMappingDataStore.getState();
        const getKey = (id: string) => (id.includes("___") ? id.split("___")[0] : id);
        const activeKey = getKey(String(active.id));
        const overKey = getKey(String(over.id));
        const oldIndex = cat.findIndex((f) => f.field_key === activeKey);
        const newIndex = cat.findIndex((f) => f.field_key === overKey);
        if (oldIndex !== -1 && newIndex !== -1 && cat[oldIndex].group === cat[newIndex].group) {
            setFieldCatalog(arrayMove(cat, oldIndex, newIndex));
        }
    }, []);

    return { sensors, handleDragEnd };
}
