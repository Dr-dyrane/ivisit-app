import { MAP_ROUTE_PROFILE } from "../../services/routeService";

export const mapRouteQueryKeys = {
  all: ["mapRoute"],
  detail: ({ routeKey, profile = MAP_ROUTE_PROFILE }) => [
    "mapRoute",
    profile,
    routeKey,
  ],
};

export default mapRouteQueryKeys;
