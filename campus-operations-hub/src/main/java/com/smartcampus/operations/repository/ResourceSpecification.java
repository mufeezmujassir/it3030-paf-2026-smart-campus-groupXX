package com.smartcampus.operations.repository;

import com.smartcampus.operations.entity.Resource;
import com.smartcampus.operations.entity.ResourceStatus;
import com.smartcampus.operations.entity.ResourceType;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class ResourceSpecification {

    public static Specification<Resource> build(String type,
                                               String subtype,
                                               Integer minCapacity,
                                               Integer maxCapacity,
                                               String location,
                                               String status,
                                               String keyword) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (type != null && !type.isBlank()) {
                try {
                    ResourceType rt = ResourceType.valueOf(type.toUpperCase());
                    predicates.add(cb.equal(root.get("type"), rt));
                } catch (IllegalArgumentException ignored) {}
            }

            if (subtype != null && !subtype.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("subtype")), "%" + subtype.toLowerCase() + "%"));
            }

            if (minCapacity != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("capacity"), minCapacity));
            }

            if (maxCapacity != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("capacity"), maxCapacity));
            }

            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("location")), "%" + location.toLowerCase() + "%"));
            }

            if (status != null && !status.isBlank()) {
                try {
                    ResourceStatus rs = ResourceStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), rs));
                } catch (IllegalArgumentException ignored) {}
            }

            if (keyword != null && !keyword.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + keyword.toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
