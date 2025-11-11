<template>
    <f7-block strong inset class="!p-0">
        <div class="grid grid-cols-3 gap-0">
            <!-- Totales -->
            <div class="p-4 border-b md:border-b-0 md:border-r text-center">
                <div
                    class="text-sm text-gray-500 flex items-center justify-center gap-1"
                >
                    <f7-skeleton-block class="icon-skel" />
                    <span class="skeleton-text">Totales</span>
                </div>
                <div class="mt-1">
                    <span class="skeleton-text text-2xl">000</span>
                </div>
            </div>

            <!-- Emitidas -->
            <div class="p-4 border-b md:border-b-0 md:border-r text-center">
                <div
                    class="text-sm text-gray-500 flex items-center justify-center gap-1"
                >
                    <f7-skeleton-block class="icon-skel" />
                    <span class="skeleton-text">Emitidas</span>
                </div>
                <div class="mt-1">
                    <span class="skeleton-text text-2xl">000</span>
                </div>
            </div>

            <!-- Anuladas -->
            <div class="p-4 text-center">
                <div
                    class="text-sm text-gray-500 flex items-center justify-center gap-1"
                >
                    <f7-skeleton-block class="icon-skel" />
                    <span class="skeleton-text">Anuladas</span>
                </div>
                <div class="mt-1">
                    <span class="skeleton-text text-2xl">000</span>
                </div>
            </div>
        </div>
    </f7-block>
</template>

<script>
export default {
    name: "KpiCardsSkeleton",
};
</script>

<style scoped>
.grid {
    display: grid;
}
.grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}
.p-4 {
    padding: 1rem;
}
.border-b {
    border-bottom: 1px solid #e5e7eb;
}
.md\:border-b-0 {
    border-bottom: none;
}
.md\:border-r {
    border-right: 1px solid #e5e7eb;
}
.text-center {
    text-align: center;
}
.text-sm {
    font-size: 0.875rem;
}
.text-2xl {
    font-size: 1.5rem;
}
.mt-1 {
    margin-top: 0.25rem;
}
.text-gray-500 {
    color: #6b7280;
}
.flex {
    display: flex;
}
.items-center {
    align-items: center;
}
.justify-center {
    justify-content: center;
}
.gap-1 {
    gap: 0.25rem;
}

/* Skeleton "iconito" redondo */
.icon-skel {
    width: 18px;
    height: 18px;
    border-radius: 999px;
}
</style>
