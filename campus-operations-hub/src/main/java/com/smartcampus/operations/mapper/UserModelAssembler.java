package com.smartcampus.operations.mapper;

import com.smartcampus.operations.controller.UserController;
import com.smartcampus.operations.controller.AdminUserController;
import com.smartcampus.operations.dto.UserResponse;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.RepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@Component
public class UserModelAssembler implements RepresentationModelAssembler<UserResponse, EntityModel<UserResponse>> {

    @Override
    public EntityModel<UserResponse> toModel(UserResponse user) {
        // Build base links
        EntityModel<UserResponse> userModel = EntityModel.of(user,
                linkTo(methodOn(AdminUserController.class).getUserById(user.getId())).withSelfRel(),
                linkTo(methodOn(AdminUserController.class).getAllUsers()).withRel("users")
        );

        // Add additional links based on state or actions
        userModel.add(linkTo(methodOn(UserController.class).getMe(null)).withRel("me"));
        
        return userModel;
    }
}
