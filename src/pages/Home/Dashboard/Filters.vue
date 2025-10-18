<template>
    <f7-block class="space-y-2">
        <div class="flex items-center justify-between gap-2">
            <f7-segmented strong tag="div" class="w-full">
                <f7-button :active="range === 'today'" @click="set('today')"
                    >Hoy</f7-button
                >
                <f7-button :active="range === '7d'" @click="set('7d')"
                    >7 días</f7-button
                >
                <f7-button :active="range === '30d'" @click="set('30d')"
                    >30 días</f7-button
                >
            </f7-segmented>
        </div>

        <div
            v-if="range === 'custom'"
            class="grid grid-cols-1 md:grid-cols-2 gap-2"
        >
            <f7-list inline-labels no-hairlines-md>
                <f7-list-input
                    label="Desde"
                    type="date"
                    :value="from"
                    @input="setFrom($event.target.value)"
                />
            </f7-list>
            <f7-list inline-labels no-hairlines-md>
                <f7-list-input
                    label="Hasta"
                    type="date"
                    :value="to"
                    @input="setTo($event.target.value)"
                />
            </f7-list>
        </div>
    </f7-block>
</template>

<script>
export default {
    name: "Filters",
    props: {
        range: { type: String, default: "7d" },
        from: { type: String, default: "" },
        to: { type: String, default: "" },
        onlyUser: { type: Boolean, default: false },
    },
    methods: {
        toISODate(d) {
            const dt = new Date(d);
            return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
        },
        set(preset) {
            const now = new Date();
            const end = this.toISODate(now);
            let from = this.from,
                to = this.to;

            if (preset === "today") {
                from = end;
                to = end;
            } else if (preset === "7d") {
                const s = new Date(now);
                s.setDate(s.getDate() - 6);
                from = this.toISODate(s);
                to = end;
            } else if (preset === "30d") {
                const s = new Date(now);
                s.setDate(s.getDate() - 29);
                from = this.toISODate(s);
                to = end;
            }

            this.$emit("update:range", preset);
            this.$emit("update:from", from);
            this.$emit("update:to", to);
        },
        setFrom(v) {
            this.$emit("update:from", v);
        },
        setTo(v) {
            this.$emit("update:to", v);
        },
        setOnlyUser(v) {
            this.$emit("update:onlyUser", !!v);
        },
    },
};
</script>

<style scoped>
.space-y-2 > * + * {
    margin-top: 0.5rem;
}
.grid {
    display: grid;
}
.md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
.gap-2 {
    gap: 0.5rem;
}
.flex {
    display: flex;
}
.items-center {
    align-items: center;
}
.gap-3 {
    gap: 0.75rem;
}
.text-sm {
    font-size: 0.875rem;
}
.text-gray-500 {
    color: #6b7280;
}
.ml-1 {
    margin-left: 0.25rem;
}
.w-full {
    width: 100%;
}
</style>
