import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("diagram/:id", "routes/diagram.$id.tsx"),
    route("api/export/:id", "routes/api.export.$id.ts"),
    route("api/sandbox/:id", "routes/api.sandbox.$id.ts"),
    route("api/sandbox/:id/:table", "routes/api.sandbox.$id.$table.ts"),
] satisfies RouteConfig;
